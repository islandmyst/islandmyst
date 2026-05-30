<?php

namespace App\Utilities;

/**
 * Class OFXParser
 * @package App\Utilities
 * @author Benjamin Serr
 * OFXParser is a utility class for parsing parseOFXDocument OFX documents into XML.
 * The OFX syntax is similar to XML, but it is not well-formed (Lacking closing tags
 * for element with only text content) and cannot be parsed directly with an XML parser.
 * This class parses backwards through the OFX document, creating XML elements as it goes,
 * and returns a DOMDocument that can be used with standard XML libraries. Text only
 * elements are converted to attributes on their parent element.
 */
class OFXParser
{
    /**
     * @param string $text The OFX document as a string
     * return \DOMDocument The parsed OFX document as a DOMDocument
     */
    public static function parseOFXDocument(string $text) : \DOMDocument
    {
        $dom = new \DOMDocument();
        $dom->formatOutput = true;
        
        // Parse and remove the OFX header
        $header = substr($text, 0, strpos($text, '<OFX>') - 5);
        $sgml = trim(substr($text, strpos($text, '<OFX>')));
        // Normalize line endings
        $sgml = str_replace("\r", "", $sgml);
        $lines = explode("\n", $sgml);
        // Note: the line index starts at the end of the document
        $lineIndex = count($lines) - 1;
        // Parse the document
        self::readElement($lines, $lineIndex, $dom);
        return $dom;
    }

    /**
     * This function 
     * @param array $lines Array of lines from the OFX file.
     * @param int $lineIndex Index of the current line being processed.
     * @param \DOMDocument|\DOMElement $dom The DOM document or element to append to.
     */
    public static function readElement(&$lines, &$lineIndex, $dom)
    {
        $tagName = trim($lines[$lineIndex--], "</>");
        /** @var \DOMElement $element */
        if($dom instanceof \DOMDocument){
            $element = $dom->createElement($tagName);
        } else {
            $element = $dom->ownerDocument->createElement($tagName);
        }
        $dom->appendChild($element);

        for(; $lineIndex >= 0; $lineIndex--){
            $line = $lines[$lineIndex];
            if(str_starts_with($line, "<$tagName")){
                //We have found the opening tag for this element, we can stop parsing
                return;
            } else if(str_starts_with($line, '</')){
                // Recursively read the next element
                self::readElement($lines, $lineIndex, $element);
            } else if (preg_match('/<(?<attribute>.*?)>(?<value>.*)/', $line, $matches)) {
                // The element has no closing tag so we'll convert it to an attribute
                $element->setAttribute($matches['attribute'], $matches['value']);
            }
        }
    }
}
